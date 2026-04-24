@RestController
@RequestMapping("/user")
public class UserController {

    @GetMapping("/dashboard")
    public String dashboard() {
        return "User Dashboard";
    }
}