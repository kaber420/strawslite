package proxy

import (
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type ProxyServer struct {
	Addr           string
	CertsDir       string
	LoggingEnabled bool
	OnEvent        func(event map[string]interface{})
	certificates   map[string]tls.Certificate
}

func (p *ProxyServer) Start() error {
	if p.CertsDir != "" {
		if err := p.LoadCertificates(); err != nil {
			log.Printf("Warning: highlighting error loading certificates: %v", err)
		}
	}

	server := &http.Server{
		Addr:         p.Addr,
		Handler:      p,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		TLSConfig: &tls.Config{
			GetCertificate: p.getCertificate,
		},
	}

	if p.CertsDir != "" {
		// Try to start with TLS if there are certificates, but ListenAndServeTLS 
		// with no arguments uses the dynamic GetCertificate
		log.Printf("Starting Straws Engine with Dynamic TLS support on %s", p.Addr)
		return server.ListenAndServeTLS("", "")
	}
	return server.ListenAndServe()
}

func (p *ProxyServer) LoadCertificates() error {
	p.certificates = make(map[string]tls.Certificate)
	if _, err := os.Stat(p.CertsDir); os.IsNotExist(err) {
		return os.MkdirAll(p.CertsDir, 0755)
	}

	files, err := os.ReadDir(p.CertsDir)
	if err != nil {
		return err
	}

	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".crt") {
			base := strings.TrimSuffix(f.Name(), ".crt")
			keyPath := filepath.Join(p.CertsDir, base+".key")
			if _, err := os.Stat(keyPath); err == nil {
				cert, err := tls.LoadX509KeyPair(filepath.Join(p.CertsDir, f.Name()), keyPath)
				if err == nil {
					p.certificates[base] = cert
					log.Printf("Loaded legal certificate for: %s", base)
				}
			}
		}
	}
	return nil
}

func (p *ProxyServer) getCertificate(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	if cert, ok := p.certificates[hello.ServerName]; ok {
		return &cert, nil
	}
	// Fallback or error
	return nil, fmt.Errorf("no certificate for %s", hello.ServerName)
}

func (p *ProxyServer) GetAvailableCerts() []string {
	var names []string
	for name := range p.certificates {
		names = append(names, name)
	}
	return names
}

func (p *ProxyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		p.handleConnect(w, r)
	} else {
		p.handleHTTP(w, r)
	}
}

func (p *ProxyServer) handleHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	// Standard Reverse Proxy
	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = r.Host
		},
		ModifyResponse: func(resp *http.Response) error {
			if p.LoggingEnabled && p.OnEvent != nil {
				p.OnEvent(map[string]interface{}{
					"type":    "http",
					"url":     r.URL.String(),
					"method":  r.Method,
					"host":    r.Host,
					"status":  resp.StatusCode,
					"latency": time.Since(start).String(),
					"size":    resp.ContentLength,
				})
			}
			return nil
		},
	}
	proxy.ServeHTTP(w, r)
}

func (p *ProxyServer) handleConnect(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	// HTTPS Passthrough (Tunneling)
	destConn, err := net.DialTimeout("tcp", r.Host, 10*time.Second)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)

	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "Hijacking not supported", http.StatusInternalServerError)
		return
	}

	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	var size int64
	go func() {
		n, _ := io.Copy(destConn, clientConn)
		size += n
	}()
	
	n, _ := io.Copy(clientConn, destConn)
	size += n

	if p.LoggingEnabled && p.OnEvent != nil {
		p.OnEvent(map[string]interface{}{
			"type":    "connect",
			"host":    r.Host,
			"method":  "CONNECT",
			"status":  200,
			"latency": time.Since(start).String(),
			"size":    size,
		})
	}
}
