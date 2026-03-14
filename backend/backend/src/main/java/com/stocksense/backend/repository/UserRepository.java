package com.stocksense.backend.repository;

import com.stocksense.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User,Long>{

    Optional<User> findByEmail(String email);

    Boolean existsByEmail(String email);


    List<User> findByRole(String role);

    List<User> findByIsActiveTrue();

    @Query("SELECT u FROM User u where u.email = :email AND u.isActive= true")

    Optional<User> findActiveUSerByEmail(String email);
}
