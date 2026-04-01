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
	"sync"
	"time"
)

type ProxyRule struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Type        string `json:"type"` // "engine" or "passthrough"
	Cert        string `json:"cert"`
}

type ProxyServer struct {
	Addr           string
	CertsDir       string
	LoggingEnabled bool
	OnEvent        func(event map[string]interface{})
	certificates   map[string]tls.Certificate
	rules          map[string]ProxyRule
	rulesMu        sync.RWMutex
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

	log.Printf("Starting Straws Engine on %s (Declarative Proxy Mode)", p.Addr)
	return server.ListenAndServe()
}

func (p *ProxyServer) UpdateRules(newRules []ProxyRule) {
	p.rulesMu.Lock()
	defer p.rulesMu.Unlock()
	p.rules = make(map[string]ProxyRule)
	for _, r := range newRules {
		p.rules[r.Source] = r
	}
	log.Printf("Updated Rule Table: %d domains registered", len(newRules))
}

func (p *ProxyServer) getRule(host string) (ProxyRule, bool) {
	p.rulesMu.RLock()
	defer p.rulesMu.RUnlock()
	
	// 1. Exact match
	if rule, ok := p.rules[host]; ok {
		return rule, true
	}
	
	// 2. Subdomain check (e.g. api.mysite.local matches mysite.local)
	for source, rule := range p.rules {
		if strings.HasSuffix(host, "."+source) {
			return rule, true
		}
	}
	
	return ProxyRule{}, false
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
	
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".crt") {
			base := strings.TrimSuffix(f.Name(), ".crt")
			keyPath := filepath.Join(p.CertsDir, base+".key")
			if _, err := os.Stat(keyPath); err == nil {
				cert, err := tls.LoadX509KeyPair(filepath.Join(p.CertsDir, f.Name()), keyPath)
				if err == nil {
					p.certificates[base] = cert
					leaf, err := x509.ParseCertificate(cert.Certificate[0])
					if err == nil {
						cert.Leaf = leaf
						for _, dnsName := range leaf.DNSNames {
							p.certificates[dnsName] = cert
						}
					}
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
	if cert, ok := p.certificates[hello.ServerName]; ok {
		return &cert, nil
	}
	for _, cert := range p.certificates {
		if cert.Leaf != nil {
			for _, name := range cert.Leaf.DNSNames {
				if matchWildcard(name, hello.ServerName) {
					return &cert, nil
				}
			}
		}
	}
	return nil, fmt.Errorf("no certificate for %s", hello.ServerName)
}

func (p *ProxyServer) GetAvailableCerts() []string {
	var names []string
	seen := make(map[string]bool)
	for name := range p.certificates {
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

	rule, ok := p.getRule(host)
	if !ok {
		// FAIL FAST: Domain not declared
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintf(w, "Domain [%s] not registered in Straws Engine", host)
		if p.OnEvent != nil {
			p.OnEvent(map[string]interface{}{"type":"log","message":"Blocked unregistered host: "+host,"success":false})
		}
		return
	}

	if r.Method == http.MethodConnect {
		p.handleConnect(w, r, rule)
	} else {
		p.handleReverseProxy(w, r, rule)
	}
}

func (p *ProxyServer) handleReverseProxy(w http.ResponseWriter, r *http.Request, rule ProxyRule) {
	start := time.Now()
	
	targetHost := rule.Destination
	if !strings.Contains(targetHost, ":") {
		targetHost += ":80" // Default port if missing for HTTP
	}

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = targetHost
			req.Host = r.Host // Preserve original host header
		},
		ErrorLog: log.New(io.Discard, "", 0),
	}
	proxy.ServeHTTP(w, r)
	
	if p.LoggingEnabled && p.OnEvent != nil {
		p.OnEvent(map[string]interface{}{
			"type":    "http",
			"url":     r.URL.String(),
			"host":    r.Host,
			"dest":    targetHost,
			"status":  200,
			"latency": time.Since(start).String(),
		})
	}
}

func (p *ProxyServer) handleConnect(w http.ResponseWriter, r *http.Request, rule ProxyRule) {
	start := time.Now()
	host := r.Host
	if strings.Contains(host, ":") {
		host, _, _ = net.SplitHostPort(host)
	}

	// 1. DECLARATIVE PASSTHROUGH (No TLS Termination)
	if rule.Type == "passthrough" {
		dest := rule.Destination
		if !strings.Contains(dest, ":") {
			dest += ":443"
		}
		
		destConn, err := net.DialTimeout("tcp", dest, 10*time.Second)
		if err != nil {
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
			return
		}
		defer destConn.Close()

		hijacker, ok := w.(http.Hijacker)
		if !ok { return }
		clientConn, _, err := hijacker.Hijack()
		if err != nil { return }
		defer clientConn.Close()

		clientConn.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n"))

		go io.Copy(destConn, clientConn)
		io.Copy(clientConn, destConn)
		
		if p.LoggingEnabled && p.OnEvent != nil {
			p.OnEvent(map[string]interface{}{"type":"connect","host":host,"dest":dest,"mode":"passthrough","latency":time.Since(start).String()})
		}
		return
	}

	// 2. DECLARATIVE REVERSE PROXY (TLS Termination)
	cert, err := p.getCertificate(&tls.ClientHelloInfo{ServerName: host})
	if err == nil {
		hijacker, _ := w.(http.Hijacker)
		clientConn, _, _ := hijacker.Hijack()
		defer clientConn.Close()

		clientConn.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n"))

		tlsConn := tls.Server(clientConn, &tls.Config{Certificates: []tls.Certificate{*cert}})
		if err := tlsConn.Handshake(); err != nil {
			log.Printf("TLS Handshake error for %s: %v", host, err)
			return
		}
		defer tlsConn.Close()

		// Simplified intercept response for now, or forward to Destination
		fmt.Fprintf(tlsConn, "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>Straws Engine</h1><p>Reverse Proxy to <b>%s</b> for <b>%s</b></p>", rule.Destination, host)
		
		if p.OnEvent != nil {
			p.OnEvent(map[string]interface{}{"type":"log","message":"Reverse Proxy match for "+host,"success":true})
		}
		return
	}

	// No cert and not passthrough -> Fail
	http.Error(w, "No certificate found for registered host "+host, http.StatusServiceUnavailable)
}
