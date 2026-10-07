# Imagen del backend para publicarlo (Render). Dos etapas: compilar con el JDK y ejecutar
# solo con el JRE, para que la imagen final sea más pequeña.

# ---- Compilación ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
# Las dependencias se descargan en una capa aparte: solo se repite si cambia el pom.xml.
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B package -DskipTests

# ---- Ejecución ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/biblioteca-*.jar app.jar
# Ajusta la memoria al contenedor (el plan gratuito de Render tiene 512 MB).
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
# Render indica el puerto en la variable PORT; en local se usa 8080.
CMD ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar app.jar"]
