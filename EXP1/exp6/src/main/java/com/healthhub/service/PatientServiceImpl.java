package com.healthhub.service;

import com.healthhub.dto.PatientDTO;
import com.healthhub.entity.Patient;
import com.healthhub.repository.PatientRepo;
import com.healthhub.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PatientServiceImpl implements PatientService {
    @Autowired
    private PatientRepo patientRepository;
    private PatientDTO mapToDTO(Patient patient) {
        return new PatientDTO(
                patient.getId(),
                patient.getName(),
                patient.getEmail(),
                patient.getAge(),
                patient.getDisease()
        );
    }
    private Patient mapToEntity(PatientDTO dto) {
        return new Patient(
                dto.getId(),
                dto.getName(),
                dto.getEmail(),
                dto.getAge(),
                dto.getDisease()
        );
    }
    @Override
    public PatientDTO createPatient(PatientDTO patientDTO) {
        Patient patient = mapToEntity(patientDTO);
        Patient saved = patientRepository.save(patient);
        return mapToDTO(saved);
    }
    @Override
    public List<PatientDTO> getAllPatients() {
        return patientRepository.findAll()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }
    @Override
    public PatientDTO getPatientById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        return mapToDTO(patient);
    }
    @Override
    public PatientDTO updatePatient(Long id, PatientDTO dto) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        patient.setName(dto.getName());
        patient.setEmail(dto.getEmail());
        patient.setAge(dto.getAge());
        patient.setDisease(dto.getDisease());
        Patient updated = patientRepository.save(patient);
        return mapToDTO(updated);
    }
    @Override
    public void deletePatient(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
        patientRepository.delete(patient);
    }
}