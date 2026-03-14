package com.stocksense.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "stock_data")

public class StockData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="symbol" , nullable = false)
    private String symbol;

    @Column(name="company_name" , nullable = false)
    private String companyName;

    @Column(name="open_price" , precision =10 , scale=2)
    private BigDecimal openPrice;

    @Column(name="close_price" ,  precision =10 , scale=2)
    private BigDecimal closePrice;

    @Column(name="high_price" ,  precision =10 , scale=2)
    private BigDecimal highPrice;


    @Column(name="low_price" ,  precision =10 , scale=2)
    private BigDecimal lowPrice;

    @Column(name = "volume")
    private Long volume;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        recordedAt = LocalDateTime.now();
    }
}

