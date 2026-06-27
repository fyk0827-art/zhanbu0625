package com.qacollector;

import com.lifeblueprint.config.PaymentProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = {"com.qacollector", "com.lifeblueprint"})
@EnableConfigurationProperties({PaymentProperties.class})
public class QaCollectorApplication {
    public static void main(String[] args) {
        SpringApplication.run(QaCollectorApplication.class, args);
    }
}
