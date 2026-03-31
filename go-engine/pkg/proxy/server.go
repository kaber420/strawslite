package proxy

import (
	"crypto/tls"
	"crypto/x509"
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
			log.Printf("Warning: error loading certificates: %v", err)
		}
	}

	server := &http.Server{
		Addr:         p.Addr,
		Handler:      p,
		ReadTimeout:  1 * time.Minute,
		WriteTimeout: 1 * time.Minute,
	}

	log.Printf("Starting Straws Engine on %s (HTTP Proxy Mode)", p.Addr)
	return server.ListenAndServe()
}

func (p *ProxyServer) LoadCertificates() error {
	log.Printf("Scanning CertsDir: %s", p.CertsDir)
	p.certificates = make(map[string]tls.Certificate)
	if _, err := os.Stat(p.CertsDir); os.IsNotExist(err) {
		log.Printf("CRITICAL: Certs directory not found: %s", p.CertsDir)
		return os.MkdirAll(p.CertsDir, 0755)
	}
	
	files, err := os.ReadDir(p.CertsDir)
	if err != nil {
		log.Printf("ERROR: Failed to read certs dir: %v", err)
		return err
	}
	log.Printf("Found %d entries in certs dir", len(files))
	
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".crt") {
			base := strings.TrimSuffix(f.Name(), ".crt")
			keyPath := filepath.Join(p.CertsDir, base+".key")
			if _, err := os.Stat(keyPath); err == nil {
				cert, err := tls.LoadX509KeyPair(filepath.Join(p.CertsDir, f.Name()), keyPath)
				if err == nil {
					// 1. Map by filename (stable default)
					p.certificates[base] = cert
					
					// 2. Try to parse SANs for better SNI support
					leaf, err := x509.ParseCertificate(cert.Certificate[0])
					if err == nil {
						cert.Leaf = leaf
						for _, dnsName := range leaf.DNSNames {
							p.certificates[dnsName] = cert
						}
						log.Printf("Loaded cert [%s] for dns: %v", base, leaf.DNSNames)
					} else {
						log.Printf("Loaded cert [%s] (no SAN parsing)", base)
					}
				} else {
					log.Printf("Error loading keypair for %s: %v", base, err)
				}
			}
		}
	}
	return nil
}

func matchWildcard(pattern, host string) bool {
	if !strings.Contains(pattern, "*") {
		return pattern == host
	}
	parts := strings.Split(pattern, "*")
	if len(parts) != 2 {
		return false
	}
	return strings.HasPrefix(host, parts[0]) && strings.HasSuffix(host, parts[1])
}

func (p *ProxyServer) getCertificate(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	// 1. Direct match (Fast)
	if cert, ok := p.certificates[hello.ServerName]; ok {
		p.logTLSMatch(hello.ServerName)
		return &cert, nil
	}
	
	// 2. Wildcard match (check all loaded certs)
	for _, cert := range p.certificates {
		if cert.Leaf != nil {
			for _, name := range cert.Leaf.DNSNames {
				if matchWildcard(name, hello.ServerName) {
					p.logTLSMatch(hello.ServerName)
					return &cert, nil
				}
			}
		}
	}
	
	if p.OnEvent != nil {
		p.OnEvent(map[string]interface{}{
			"type":    "tls_error",
			"host":    hello.ServerName,
			"error":   fmt.Sprintf("No certificate found for %s", hello.ServerName),
			"success": false,
		})
	}
	return nil, fmt.Errorf("no certificate for %s", hello.ServerName)
}

func (p *ProxyServer) logTLSMatch(host string) {
	if p.OnEvent != nil {
		p.OnEvent(map[string]interface{}{
			"type":    "tls_match",
			"host":    host,
			"success": true,
		})
	}
}

func (p *ProxyServer) GetAvailableCerts() []string {
	var names []string
	seen := make(map[string]bool)
	for name := range p.certificates {
		// Clean up the list: only exported bases if they don't look like domain names?
		// Better: just deduplicate everything for now but favor shorter names.
		if !seen[name] {
			names = append(names, name)
			seen[name] = true
		}
	}
	return names
}

func (p *ProxyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	host := r.Host
	if strings.Contains(host, ":") {
		host, _, _ = net.SplitHostPort(host)
	}

	// Check if this is a request for a domain we serve
	if _, ok := p.certificates[host]; ok && r.Method != http.MethodConnect {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "<h1>Straws Engine (HTTP)</h1><p>Successfully intercepted <b>%s</b></p>", host)
		if p.OnEvent != nil {
			p.OnEvent(map[string]interface{}{"type":"log","message":"Intercepted HTTP for "+host,"success":true})
		}
		return
	}

	if r.Method == http.MethodConnect {
		p.handleConnect(w, r)
	} else {
		p.handleHTTP(w, r)
	}
}

func (p *ProxyServer) handleHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	// Standard Reverse Proxy for other domains
	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = r.Host
		},
	}
	proxy.ServeHTTP(w, r)
	
	if p.LoggingEnabled && p.OnEvent != nil {
		p.OnEvent(map[string]interface{}{
			"type":    "http",
			"url":     r.URL.String(),
			"method":  r.Method,
			"host":    r.Host,
			"status":  200,
			"latency": time.Since(start).String(),
		})
	}
}

func (p *ProxyServer) handleConnect(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	host := r.Host
	if strings.Contains(host, ":") {
		host, _, _ = net.SplitHostPort(host)
	}

	// Check if we have a certificate for this host
	cert, err := p.getCertificate(&tls.ClientHelloInfo{ServerName: host})
	if err == nil {
		// HIJACK and Terminate TLS
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
		defer clientConn.Close()

		// Send 200 OK to the client to establish the tunnel
		clientConn.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n"))

		// Start TLS Handshake with the client
		tlsConn := tls.Server(clientConn, &tls.Config{
			Certificates: []tls.Certificate{*cert},
		})
		if err := tlsConn.Handshake(); err != nil {
			log.Printf("TLS Handshake error for %s: %v", host, err)
			return
		}
		defer tlsConn.Close()

		// Now we have a decrypted connection (tlsConn)
		// We can serve a dummy "Hello from Straws" or proxy it further.
		p.handleHTTP(w, &http.Request{
			Method: "GET",
			URL:    r.URL,
			Host:   r.Host,
			RemoteAddr: r.RemoteAddr,
			Body: io.NopCloser(tlsConn),
		})
		// Actually, simpler for "Straws": just send a 200 OK "Straws is intercepting" or proxy.
		// For now, let's just send a simple "SUCCESS" response over TLS.
		fmt.Fprintf(tlsConn, "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>Straws Engine</h1><p>Interception successful for <b>%s</b></p>", host)
		
		if p.OnEvent != nil {
			p.OnEvent(map[string]interface{}{"type":"log","message":"Intercepted HTTPS for "+host,"success":true})
		}
		return
	}

	// NORMAL TUNNELING (Passthrough)
	destConn, err := net.DialTimeout("tcp", r.Host, 10*time.Second)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}
	defer destConn.Close()

	w.WriteHeader(http.StatusOK)
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		return
	}
	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		return
	}
	defer clientConn.Close()

	go io.Copy(destConn, clientConn)
	io.Copy(clientConn, destConn)

	if p.LoggingEnabled && p.OnEvent != nil {
		p.OnEvent(map[string]interface{}{
			"type":    "connect",
			"host":    r.Host,
			"method":  "CONNECT",
			"status":  200,
			"latency": time.Since(start).String(),
		})
	}
}
