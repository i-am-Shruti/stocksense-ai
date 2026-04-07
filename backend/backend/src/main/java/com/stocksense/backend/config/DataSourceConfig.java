package com.stocksense.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;

@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        
        if (databaseUrl != null && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
            try {
                // Parse the connection string properly
                String decodedUrl = URLDecoder.decode(databaseUrl, "UTF-8");
                URI uri = URI.create(decodedUrl);
                
                String username = uri.getUserInfo().split(":")[0];
                String password = uri.getUserInfo().split(":")[1];
                String host = uri.getHost();
                String database = uri.getPath().substring(1); // Remove leading /
                String query = uri.getQuery();
                
                // Build proper JDBC URL
                String jdbcUrl = "jdbc:postgresql://" + host + "/" + database;
                if (query != null) {
                    jdbcUrl += "?" + query;
                }
                
                System.out.println("=== Using Neon DATABASE_URL ===");
                System.out.println("Host: " + host);
                System.out.println("Database: " + database);
                System.out.println("Username: " + username);
                
                HikariConfig config = new HikariConfig();
                config.setJdbcUrl(jdbcUrl);
                config.setUsername(username);
                config.setPassword(password);
                config.setDriverClassName("org.postgresql.Driver");
                
                return new HikariDataSource(config);
            } catch (Exception e) {
                System.out.println("=== Error parsing DATABASE_URL: " + e.getMessage() + " ===");
            }
        }
        
        return null;
    }
}