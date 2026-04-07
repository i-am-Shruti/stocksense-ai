package com.stocksense.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        
        if (databaseUrl != null && databaseUrl.startsWith("postgres://")) {
            // Convert postgres:// to jdbc:postgresql://
            // postgres://user:password@host/db -> jdbc:postgresql://host/db
            
            String url = databaseUrl
                .replace("postgres://", "jdbc:postgresql://")
                .replace("%40", "@"); // Handle URL encoded @ symbol
            
            System.out.println("=== Using Neon DATABASE_URL ===");
            System.out.println("Converted JDBC URL: " + url);
            
            // Extract user and password from URL
            String withoutJdbc = url.replace("jdbc:postgresql://", "");
            String[] atParts = withoutJdbc.split("@");
            String userInfo = atParts[0];
            String hostDb = atParts[1];
            
            String[] userPass = userInfo.split(":");
            String username = userPass[0];
            String password = userPass[1];
            
            HikariConfig config = new HikariConfig();
            config.setJdbcUrl(url);
            config.setUsername(username);
            config.setPassword(password);
            config.setDriverClassName("org.postgresql.Driver");
            
            return new HikariDataSource(config);
        }
        
        return null; // Let Spring use application.properties
    }
}