package com.stocksense.backend.dto;

import  lombok.Data;
import lombok.AllArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor

public class StockDataDTO {
    private Long id;
    private String symbol;
    private String companyName;
    private BigDecimal openPrice;
    private BigDecimal closePrice;
    private BigDecimal highPrice;
    private BigDecimal lowPrice;
    private Long volume;
    private LocalDateTime recordedAt;

    private BigDecimal priceChange;       // closePrice - openPrice
    private BigDecimal percentageChange;  // (priceChange / openPrice) * 100

}
