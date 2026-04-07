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
            // Parse the Neon connection string
            // postgres://user:password@host.neon.tech/dbname?sslmode=require
            
            // Remove "postgres://" prefix
            String withoutPrefix = databaseUrl.replace("postgres://", "");
            
            // Split at @ to get user:password and host/db
            String[] atSplit = withoutPrefix.split("@");
            if (atSplit.length != 2) {
                throw new IllegalArgumentException("Invalid DATABASE_URL format");
            }
            
            String userInfo = atSplit[0];
            String hostDbParams = atSplit[1];
            
            // Split user:password
            String[] userPass = userInfo.split(":");
            if (userPass.length != 2) {
                throw new IllegalArgumentException("Invalid user:password format");
            }
            String username = userPass[0];
            String password = userPass[1];
            
            // Split host/db and params
            String[] hostAndDb = hostDbParams.split("\\?")[0].split("/");
            String host = hostAndDb[0];
            String database = hostAndDb[1];
            
            // Build proper JDBC URL
            String jdbcUrl = String.format("jdbc:postgresql://%s/%s?sslmode=require", host, database);
            
            System.out.println("=== Using Neon DB ===");
            System.out.println("JDBC URL: " + jdbcUrl);
            System.out.println("Username: " + username);
            
            return DataSourceBuilder.create()
                    .url(jdbcUrl)
                    .username(username)
                    .password(password)
                    .driverClassName("org.postgresql.Driver")
                    .type(HikariDataSource.class)
                    .build();
        }
        
        // Fallback to default - will use application.properties settings
        System.out.println("=== Using default DB from properties ===");
        return null;
    }
}