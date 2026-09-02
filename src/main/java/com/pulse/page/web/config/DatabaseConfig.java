package com.pulse.page.web.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.pulse.page.web.repository.jpa")
@EnableMongoRepositories(basePackages = "com.pulse.page.web.repository.mongo")
public class DatabaseConfig {
}
