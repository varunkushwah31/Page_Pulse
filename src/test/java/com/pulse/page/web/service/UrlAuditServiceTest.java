package com.pulse.page.web.service;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.repository.AuditReportJpaRepository;
import com.pulse.page.web.repository.AuditReportMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UrlAuditServiceTest {

    @Mock
    private AuditReportJpaRepository jpaRepository;

    @Mock
    private AuditReportMongoRepository mongoRepository;

    private UrlAuditService service;

    @BeforeEach
    void setUp() {
        service = new UrlAuditService(jpaRepository, mongoRepository);
    }

    @Test
    void validateUrl_validUrl_returnsNormalizedUrl() {
        String result = service.validateUrl("example.com");
        assertEquals("https://example.com", result);
    }

    @Test
    void validateUrl_blankString_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> service.validateUrl("   "));
    }

    @Test
    void validateUrl_invalidScheme_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> service.validateUrl("ftp://files.example.com"));
    }

    @Test
    void saveAuditReportToMongo_existingTempId_movesEntityToDocumentAndDeletesFromH2() {
        AuditReportEntity transientEntity = AuditReportEntity.builder()
            .id(10L)
            .url("https://example.com")
            .domain("example.com")
            .httpStatus(200)
            .responseTimeMs(150L)
            .pageTitle("Example Domain")
            .metaDescription("Description")
            .h1Count(1)
            .imagesMissingAltCount(2)
            .wordCount(100)
            .contentType("text/html")
            .build();

        when(jpaRepository.findById(10L)).thenReturn(Optional.of(transientEntity));
        when(mongoRepository.save(any(AuditReportDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        AuditReportDocument result = service.saveAuditReportToMongo(10L);

        assertNotNull(result);
        assertEquals("https://example.com", result.getUrl());
        assertEquals(10L, result.getOriginalTempId());
        verify(mongoRepository, times(1)).save(any(AuditReportDocument.class));
        verify(jpaRepository, times(1)).deleteById(10L);
    }

    @Test
    void saveAuditReportToMongo_nonExistingTempId_throwsNoSuchElementException() {
        when(jpaRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> service.saveAuditReportToMongo(999L));
    }
}
