package com.healthhub.controller;

import com.healthhub.dto.PatientDTO;
import com.healthhub.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    @Autowired
    private PatientService patientService;

    @PostMapping
    public PatientDTO createPatient(@Valid @RequestBody PatientDTO patientDTO) {
        return patientService.createPatient(patientDTO);
    }

    @GetMapping
    public List<PatientDTO> getAllPatients() {
        return patientService.getAllPatients();
    }

    @GetMapping("/{id}")
    public PatientDTO getPatientById(@PathVariable Long id) {
        return patientService.getPatientById(id);
    }

    @PutMapping("/{id}")
    public PatientDTO updatePatient(@PathVariable Long id,
                                    @Valid @RequestBody PatientDTO patientDTO) {
        return patientService.updatePatient(id, patientDTO);
    }

    @DeleteMapping("/{id}")
    public String deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id);
        return "Patient deleted successfully";
    }
}