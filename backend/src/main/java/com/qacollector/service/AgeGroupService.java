package com.qacollector.service;

import com.qacollector.dto.AgeGroupDTO;
import com.qacollector.entity.AgeGroup;
import com.qacollector.repository.AgeGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class AgeGroupService {
    private final AgeGroupRepository repository;
    private final SettingsService settingsService;

    public AgeGroupService(AgeGroupRepository repository, SettingsService settingsService) {
        this.repository = repository;
        this.settingsService = settingsService;
    }

    public List<AgeGroupDTO> listAll() {
        List<AgeGroup> groups = repository.findAllByOrderBySortOrderAsc();
        List<AgeGroupDTO> result = new ArrayList<>();
        for (AgeGroup g : groups) {
            AgeGroupDTO dto = new AgeGroupDTO();
            dto.setId(g.getId());
            dto.setName(g.getName());
            dto.setMinAge(g.getMinAge());
            dto.setMaxAge(g.getMaxAge());
            dto.setPrice(g.getPrice());
            dto.setSortOrder(g.getSortOrder());
            result.add(dto);
        }
        return result;
    }

    @Transactional
    public void setUnifiedPrice(BigDecimal price) {
        List<AgeGroup> groups = repository.findAll();
        for (AgeGroup g : groups) {
            g.setPrice(price);
        }
        repository.saveAll(groups);
        // Sync report price to match age group price
        settingsService.updateReportPrice(price.toString());
    }
}
