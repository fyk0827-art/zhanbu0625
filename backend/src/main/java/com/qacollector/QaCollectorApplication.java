package com.qacollector;

import com.lifeblueprint.config.PaymentProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = {"com.qacollector", "com.lifeblueprint"})
@EnableConfigurationProperties({PaymentProperties.class})
@EnableAsync
public class QaCollectorApplication {
    public static void main(String[] args) {
        SpringApplication.run(QaCollectorApplication.class, args);
    }
}
