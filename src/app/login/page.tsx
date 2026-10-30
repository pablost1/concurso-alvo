import { entrar } from "../actions";
import { FormAuth } from "../form-auth";

export default function Login() {
  return (
    <div className="card">
      <h1>Entrar</h1>
      <FormAuth action={entrar} />
    </div>
  );
}
