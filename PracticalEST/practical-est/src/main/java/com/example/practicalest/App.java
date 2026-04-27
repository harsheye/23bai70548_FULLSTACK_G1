package com.clinic;

import jakarta.persistence.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.web.bind.annotation.*;
import java.util.List;

//  Entity
@Entity
class Appointment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public String patientName;
    public String doctorName;
    public String department;

    Appointment() {}
    Appointment(String patientName, String doctorName, String department) {
        this.patientName = patientName;
        this.doctorName  = doctorName;
        this.department  = department;
    }
}


interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query("SELECT a FROM Appointment a WHERE LOWER(a.doctorName) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Appointment> searchByDoctor(@Param("name") String name);
}

// ── Controller
@RestController
@RequestMapping("/appointments")
class AppointmentController {

    private final AppointmentRepository repo;
    AppointmentController(AppointmentRepository repo) { this.repo = repo; }


    @GetMapping
    List<Appointment> all() { return repo.findAll(); }


    @GetMapping("/search")
    List<Appointment> search(@RequestParam String doctor) {
        return repo.searchByDoctor(doctor);
    }
}


@SpringBootApplication
public class App {

    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }

    @Bean
    CommandLineRunner seed(AppointmentRepository repo) {
        return args -> {
            repo.save(new Appointment("Harsh",  "Dr. Sneha", "Cardiology"));
            repo.save(new Appointment("Raj",    "DR. Sneha", "Cardiology"));
            repo.save(new Appointment("Kaushik",  "Dr. Kavya", "Neurology"));
            repo.save(new Appointment("Atul",  "dr. Kavya", "Neurology"));
            repo.save(new Appointment("Harsh",    "Dr. Muskan",   "Orthopedics"));
        };
    }
}
