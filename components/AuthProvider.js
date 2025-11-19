import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        await setDoc(
          doc(db, "users", u.uid),
          {
            name: u.displayName || "Usuário sem nome",
            email: u.email || "",
            photoURL: u.photoURL || "",
          },
          { merge: true }
        );
      }
    });
    return unsub;
  }, []);

  return <>{children}</>;
}
