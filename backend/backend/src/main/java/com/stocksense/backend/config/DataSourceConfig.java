package com.stocksense.backend.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSource dataSource() {
        String url = System.getenv("DATABASE_URL");
        
        if (url != null && url.startsWith("postgres://")) {
            // Convert postgres:// to jdbc:postgresql://
            url = "jdbc:postgresql://" + url.replace("postgres://", "");
            
            // Extract username and password from URL
            String hostPart = url.replace("jdbc:postgresql://", "");
            String[] parts = hostPart.split("@");
            String userInfo = parts[0];
            String hostDb = parts[1];
            
            String[] userPass = userInfo.split(":");
            String username = userPass[0];
            String password = userPass[1];
            
            String[] hostDbParts = hostDb.split("/");
            String host = hostDbParts[0];
            String db = hostDbParts[1];
            
            // Build proper JDBC URL
            String jdbcUrl = "jdbc:postgresql://" + host + "/" + db;
            
            return DataSourceBuilder.create()
                    .url(jdbcUrl)
                    .username(username)
                    .password(password)
                    .driverClassName("org.postgresql.Driver")
                    .type(HikariDataSource.class)
                    .build();
        }
        
        return DataSourceBuilder.create().build();
    }
}