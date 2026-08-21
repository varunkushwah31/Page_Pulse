package com.pulse.page.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSeoCollectionRequest {

    @NotBlank(message = "Collection name is required")
    @Size(max = 150, message = "Collection name must not exceed 150 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private String color;

    private String icon;

    private List<String> tags;

    private List<CreateSeoCollectionItemRequest> items;
}
