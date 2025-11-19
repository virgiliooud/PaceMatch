import { auth } from "../firebase";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "../styles/Profile.module.css";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (!u) router.push("/login");
      else setUser(u);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => router.push("/home")}>
        ← Voltar à Home
      </button>

      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <img src={user.photoURL} alt="Foto" className={styles.profilePic} />
        <h2 className={styles.name}>{user.displayName}</h2>
        <p className={styles.email}>{user.email}</p>
      </div>

      <button className={styles.logoutButton} onClick={handleLogout}>
        Sair da Conta
      </button>
    </div>
  );
}
