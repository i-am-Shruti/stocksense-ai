FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/backend/pom.xml .
COPY backend/backend/src ./src
RUN ./mvnw -DskipTests clean package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]