@Entity
@Getter @Setter
public class Role {

    @Id
    @GeneratedValue
    private Long id;

    private String name; // ROLE_USER, ROLE_ADMIN
}