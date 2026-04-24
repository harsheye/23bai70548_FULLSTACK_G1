@Entity
@Getter @Setter
public class User {

    @Id
    @GeneratedValue
    private Long id;

    private String email;
    private String password;

    @ManyToMany(fetch = FetchType.EAGER)
    private Set<Role> roles;
}