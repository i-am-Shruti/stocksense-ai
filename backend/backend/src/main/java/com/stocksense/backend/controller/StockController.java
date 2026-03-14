package com.stocksense.backend.controller;

import com.stocksense.backend.dto.StockDataDTO;
import com.stocksense.backend.service.StockService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
@Slf4j

public class StockController {

    private final StockService stockService;

    @GetMapping // handles: GET http://localhost:8085/api/stocks
    public ResponseEntity<List<StockDataDTO>> getAllStocks(){
        log.info("get all stocks request received");
        List<StockDataDTO> stocks = stockService.getAllStocks();
        return  ResponseEntity.ok(stocks);
    }
    // GET /api/stocks/AAPL   → symbol = "AAPL"
    @GetMapping("/{symbol}")
    public ResponseEntity<StockDataDTO> getStockBySymbol( @PathVariable String symbol){
        log.info("Get stock request for: {}", symbol);
        StockDataDTO stock = stockService.getStockBYSymbol(symbol);
        return ResponseEntity.ok(stock);
    }
    // POST /api/stocks
    @PostMapping
    public ResponseEntity<StockDataDTO> saveStock(@RequestBody StockDataDTO stockDTO){
        log.info("save stock request for: {}" ,stockDTO.getSymbol());
        StockDataDTO saved = stockService.saveStock(stockDTO);
        return ResponseEntity.status(201).body(saved);
    }

    @GetMapping("/predict/{symbol}")
    public ResponseEntity<?> getPrediction(@PathVariable String symbol){
        // <?> = wildcard — can return any type
        // useful when response type varies
        log.info("Prediction request for: {}", symbol);
        Double prediction = stockService.getPrediction(symbol);
        return ResponseEntity.ok(Map.of(
                "symbol",symbol,
                "prediction" , prediction
        ));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteStock(
            @PathVariable Long id) {
        log.info("Delete stock request for id: {}", id);
        stockService.deleteStock(id);
        return ResponseEntity.ok("Stock deleted successfully!");
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ErrorResponseDTO {

        private int status;           // HTTP status code (400, 404, 500)
        private String error;         // error type ("Bad Request")
        private String message;       // human readable message
        private String path;          // which URL caused error
        private LocalDateTime timestamp; // when did error occur
    }
}
