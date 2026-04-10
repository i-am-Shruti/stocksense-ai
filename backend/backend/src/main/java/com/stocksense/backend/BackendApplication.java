package com.stocksense.backend;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableCaching
@EnableAsync
@Slf4j
public class BackendApplication {

	public static void main(String[] args) {
		log.info("===========================================");
		log.info("Starting StockSense AI Backend...");
		log.info("===========================================");
		try {
			SpringApplication.run(BackendApplication.class, args);
			log.info("===========================================");
			log.info("StockSense AI Backend started successfully!");
			log.info("===========================================");
		} catch (Exception e) {
			log.error("===========================================");
			log.error("FAILED TO START APPLICATION: {}", e.getMessage());
			log.error("===========================================");
			e.printStackTrace();
		}
	}

}
