@RestController
@RequestMapping("/admin")
public class AdminController {

    @GetMapping("/panel")
    public String panel() {
        return "Admin Panel";
    }
}