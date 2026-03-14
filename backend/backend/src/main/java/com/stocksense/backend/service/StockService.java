package com.stocksense.backend.service;

import com.stocksense.backend.dto.StockDataDTO;
import com.stocksense.backend.exception.ResourceNotFoundException;
import com.stocksense.backend.model.StockData;
import com.stocksense.backend.repository.StockDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j

public class StockService {

    private final StockDataRepository stockDataRepository;
    private final RestTemplate restTemplate;
    // RestTemplate = Spring's HTTP client
    // Used to call Python ML service

    @Value("${ml.service.url}")
    private String mlServiceUrl;
    // reads ml.service.url=http://localhost:5000
    // from application.properties


    //GET ALL STOCKS

    public List<StockDataDTO> getAllStocks() {
        log.info("Fetching all stocks");

        List<StockData> stocks = stockDataRepository.findAll();

        // Convert List<StockData> → List<StockDataDTO>
        // using Java Streams
        return stocks.stream().map(this::convertToDTO) // for each stock → convert to DTO
                .collect(Collectors.toList());

    }

    //GET STOCK BY SYMBOL

    public StockDataDTO getStockBYSymbol(String symbol) {
        log.info("fetching stock: {}", symbol);

        StockData stock = stockDataRepository.findTopBySymbolOrderByRecordedAtDesc(symbol)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found :" + symbol));

        return convertToDTO(stock);
    }

    // GET ML PREDICTION FROM PYTHON
    public Double getPrediction(String symbol) {
        log.info("requesting ML prediction for: {}", symbol);

        try {
            // Call Python Flask ML service
            String url = mlServiceUrl + "/predict";

            // Create request body
            Map<String, String> request = new java.util.HashMap<>();
            request.put("symbol", symbol);

            // RestTemplate calls Python API which return raw Map without types
            // We KNOW Python returns JSON object (not array)
            // Java compiler warns: "unchecked cast from Map to Map<String,Object>"
            //We KNOW the structure of the response
            // @SuppressWarnings("unchecked") just silences this warning
            // POST http://localhost:5000/predict
            // Body: {"symbol": "AAPL"}
            @SuppressWarnings("unchecked")
                    /*
                    // Python Flask returns this JSON:
                    {
                        "prediction": 189.50,    // Double
                        "symbol": "AAPL",        // String
                        "confidence": 0.95,      // Double
                        "status": "success"      // String
                    }

                    // JSON has MIXED types — String and Double together
                    // Map<String, String>  ❌ can't store Double values
                    // Map<String, Double>  ❌ can't store String values
                    // Map<String, Object>  ✅ can store ANYTHING!

                     */
            Map<String, Object> response =
                    restTemplate.postForObject(url,   // WHERE to send request → "http://localhost:5000/predict"
                            request, // WHAT to send → {"symbol": "AAPL"}
                            Map.class// WHAT types to convert response into
                    );

            if (response != null && response.containsKey("prediction")) {
                Double prediction = (Double) response.get("prediction");
                log.info("Prediction for {} : {}", symbol, prediction);
                return prediction;
            }
        } catch (Exception e) {
            log.error("ML service error for {} :{}", symbol, e.getMessage());
            throw new RuntimeException("ML prediction service unavailable!");
        }
        return null;
    }


    //SAVE STOCK DATA

    public StockDataDTO saveStock(StockDataDTO dto) {
        StockData stock = new StockData();
        // MAPPER: DTO → Model
        stock.setSymbol(dto.getSymbol());
        stock.setCompanyName(dto.getCompanyName());
        stock.setOpenPrice(dto.getOpenPrice());
        stock.setClosePrice(dto.getClosePrice());
        stock.setHighPrice(dto.getHighPrice());
        stock.setLowPrice(dto.getLowPrice());
        stock.setVolume(dto.getVolume());

        StockData saved = stockDataRepository.save(stock);
        log.info("Stock Saved; {}", saved.getSymbol());
        return convertToDTO(saved);
    }

    private StockDataDTO convertToDTO(StockData stock) {
        StockDataDTO dto = new StockDataDTO();
        // MAPPER: Model → DTO
        dto.setSymbol(stock.getSymbol());
        dto.setCompanyName(stock.getCompanyName());
        dto.setOpenPrice(stock.getOpenPrice());
        dto.setClosePrice(stock.getClosePrice());
        dto.setHighPrice(stock.getHighPrice());
        dto.setLowPrice(stock.getLowPrice());
        dto.setVolume(stock.getVolume());
        dto.setRecordedAt(stock.getRecordedAt());

        // Calculate price change (not stored in DB)
        // computed here in service layer
        if (stock.getOpenPrice() != null && stock.getClosePrice() != null) {
            // closePrice - openPrice = priceChange
            BigDecimal priceChange = stock.getClosePrice().subtract(stock.getOpenPrice());


            // (priceChange / openPrice) * 100

            // Arguments:
            //stock.getClosePrice() = 189.50
            // stock.getOpenPrice() = 185.00  ← divide BY this
            // 4                              ← keep 4 decimal places
            // RoundingMode.HALF_UP           ← rounding rule

            // Math: priceChange ÷ openPrice
            // 4.50 ÷ 185.00 = 0.02432432432...
            // Result: 0.0243  (4 decimal places)
            BigDecimal percentageChange = priceChange.divide(stock.getOpenPrice(),4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2,RoundingMode.HALF_UP);

            dto.setPriceChange(priceChange);
            dto.setPercentageChange(percentageChange);
        }
        return dto;

    }

    public void deleteStock(Long id) {
        if(!stockDataRepository.existsById(id)){
            throw new ResourceNotFoundException("Stock not found with id: "+ id);
        }
        stockDataRepository.deleteById(id);
        log.info("Stock deleted with id: {}", id);
    }
}

