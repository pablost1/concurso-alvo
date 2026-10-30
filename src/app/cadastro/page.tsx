import { cadastrar } from "../actions";
import { FormAuth } from "../form-auth";

export default function Cadastro() {
  return (
    <div className="card">
      <h1>Criar conta</h1>
      <FormAuth action={cadastrar} cadastro />
    </div>
  );
}
