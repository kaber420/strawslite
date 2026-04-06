# Arquitectura de Red StrawsPro: Sockets & Túneles

StrawsPro evoluciona de un proceso local a un **Sistema Distribuido** de tipo Comando y Control (C2). Esta arquitectura permite gestionar una flota de extensiones (Leaf Nodes) desde un servidor central en Go.

## 1. El Salto a Sockets TCP
A diferencia de StrawsLite (Native Messaging), StrawsPro utiliza redes de datos:
- **Central Go Server**: Un servidor que escucha en un puerto específico (ej. 8080) aceptando conexiones de red.
- **Leaf Nodes (Extensiones)**: Se conectan al servidor vía **WebSockets Secure (WSS)** o un Proxy reverso.
- **Ventaja**: El servidor puede estar en la nube o en un servidor local de la oficina, no necesariamente en la misma máquina que el navegador.

## 2. Autenticación y Registro de Nodos
Para evitar que nodos no autorizados se unan a la red:
1. **Node Handshake**: Al iniciar, la extensión envía un ID de Nodo y un **JWT (JSON Web Token)**.
2. **Validación**: Go verifica la licencia y el token. Si es válido, lo registra en el "Fleet Map".
3. **Keep-Alive**: Pulsos constantes para saber si el nodo (la terminal del POS o la PC del desarrollador) está online.

## 3. Protocolo de Sincronización (Data Sync)
La comunicación es bidireccional y asíncrona:
- **Upstream (Logs)**: Los "Leaf Nodes" hacen streaming de cada petición detectada hacia el servidor central.
- **Downstream (Control)**: El servidor central empuja (Push) nuevas reglas, bloqueos de emergencia o cambios de configuración a todos los nodos en milisegundos.

## 4. Seguridad: Túneles TLS
Dado que los datos de red pueden contener información sensible:
- **Cifrado de Extremo a Extremo**: Toda la comunicación Go <-> Extensión viaja sobre TLS.
- **Certificados**: En entornos de oficina, el servidor Go puede emitir y validar sus propios certificados para los nodos autorizados.

## 5. Jerarquía de Datos
- **Nivel 1 (Master)**: El Dashboard de Go (Manager). Controla todo.
- **Nivel 2 (Node)**: La máquina física (ej. Terminal 04).
- **Nivel 3 (Leaf)**: La instancia de la extensión en esa máquina.
- **Nivel 4 (Target)**: Las pestañas individuales monitoreadas.

---

> [!NOTE]
> Esta arquitectura es lo que permite que StrawsPro funcione en un **Casino** (muchas terminales) o en una **Oficina de Devs** (muchas PCs) de forma centralizada.





sequenceDiagram
    participant B as Navegador
    participant A as Nodo A (Local)
    participant T as Túnel mTLS (Seguro)
    participant B2 as Nodo B (Relay)
    participant S as Servidor Final (Google)

    Note over B,A: Paso 1: MITM Local
    B->>A: HTTPS Request (Cert A)
    Note right of A: Nodo A descifra,<br/>registra historial y aplica reglas.
    
    Note over A,B2: Paso 2: Encapsulamiento mTLS
    A-->>T: Envía Datos Descifrados (HTTP) o Re-cifrados
    T-->>B2: Recibe por puerto mTLS seguro
    
    Note over B2: Paso 3: MITM en Relay
    Note right of B2: Nodo B vuelve a registrar historial,<br/>verifica reglas globales.
    
    Note over B2,S: Paso 4: Salida a Internet
    B2->>S: HTTPS Request Final (Cert Real)
    S-->>B2: Respuesta HTTPS
    B2-->>T: Devuelve por Túnel mTLS
    T-->>A: Recibe respuesta
    A-->>B: Entrega al Navegador (Cert A)
