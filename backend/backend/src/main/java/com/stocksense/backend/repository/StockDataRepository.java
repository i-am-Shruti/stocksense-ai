package com.stocksense.backend.repository;

import com.stocksense.backend.model.StockData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.List;

public interface StockDataRepository extends JpaRepository<StockData,Long>{

    List<StockData> findBySymbol(String symbol);

    Optional<StockData> findTopBySymbolOrderByRecordedAtDesc(String symbol);

    List<StockData> findBySymbolIn(Collection<String> symbols);

    Boolean existsBySymbol(String symbol);

    @Query("SELECT s FROM StockData s ORDER BY s.volume DESC")
    List<StockData> findTopStocksByVolume();

    @Query(value = "SELECT * FROM stock_data WHERE symbol = ?1 ORDER BY recorded_at DESC LIMIT 30",
            nativeQuery = true)
    List<StockData> findLast30RecordsBySymbol(String symbol);


}

