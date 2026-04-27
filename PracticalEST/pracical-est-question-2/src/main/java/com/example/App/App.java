package com.example.App;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.stereotype.Controller;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.socket.config.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

// ── WebSocket Config ──────────────────────────────────────────────────────────
@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry
                .addEndpoint("/ws")           // clients connect to ws://localhost:8080/ws
                .setAllowedOriginPatterns("*") // allow React dev server (localhost:5173)
                .withSockJS();                 // SockJS fallback for older browsers
    }

    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");  // server broadcasts to /topic/...
        registry.setApplicationDestinationPrefixes("/app"); // client sends to /app/...
    }
}

// ── WebSocket Event Listener ──────────────────────────────────────────────────
@Configuration
class WebSocketEventListener {

    private final SimpMessagingTemplate messaging;

    WebSocketEventListener(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    // Fires when a new client connects — sends a welcome message immediately
    @org.springframework.context.event.EventListener
    public void handleConnect(org.springframework.web.socket.messaging.SessionConnectedEvent event) {
        String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));

        // Broadcast welcome message to all subscribers of /topic/messages
        messaging.convertAndSend("/topic/messages", (Object) Map.of(
                "type", "WELCOME",
                "text", "Connected to Spring Boot WebSocket server!",
                "time", time
        ));
        // Send a second message after a short delay to demonstrate streaming
        new Thread(() -> {
            try {
                Thread.sleep(1000);
                messaging.convertAndSend("/topic/messages", (Object) Map.of(
                        "type", "INFO",
                        "text", "Listening for messages. Type something below!",
                        "time", LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))
                ));
            } catch (InterruptedException ignored) {}
        }).start();
    }
}

// ── Controller ────────────────────────────────────────────────────────────────
@Controller
class MessageController {

    /**
     * Client sends a message to /app/send
     * Server broadcasts it back to everyone on /topic/messages
     */
    @MessageMapping("/send")
    @SendTo("/topic/messages")
    public Map<String, String> handleMessage(Map<String, String> payload) {
        String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        return Map.of(
                "type", "MESSAGE",
                "text", payload.getOrDefault("text", ""),
                "time", time
        );
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
