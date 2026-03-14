// Create new file: config/AppConfig.java
package com.stocksense.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
    // RestTemplate is Spring's HTTP client
    //  Used to call external APIs (our Python ML service)
}