const createUserToken = require("../helpers/createUserToken");
const getToken = require("../helpers/getToken");
const getUserByToken = require("../helpers/getUserByToken");

const Employee = require("../models/Employee");
const bcrypt = require("bcrypt");

module.exports = class EmployeeController {
  static async register(req, res) {
    const { name, email, password, cpf, role, permission } = req.body;

    try {
      const checkCPF = await Employee.findOne({ cpf: cpf });

      if (checkCPF) {
        return res.status(409).json({ errors: ["CPF já utilizado"] });
      }

      const checkEmail = await Employee.findOne({ email: email });

      if (checkEmail) {
        return res.status(409).json({ errors: ["Email já utilizado."] });
      }

      //crypt password
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const employee = new Employee({
        name,
        email,
        password: passwordHash,
        cpf,
        role,
        permission,
      });

      const newEmployee = await employee.save();

      await createUserToken(newEmployee, req, res);

      // res.status(201).json(newEmployee);
    } catch (error) {
      console.log(error);

      res.status(500).json({ errors: ["Houve um erro, tente novamente"] });
    }
  }

  static async login(req, res) {
    const { email, password } = req.body;

    const employee = await Employee.findOne({ email: email });

    if (!employee) {
      res.status(404).json({ errors: ["Usuário não encontrado"] });
      return;
    }

    const checkPassword = await bcrypt.compare(password, employee.password);

    if (!checkPassword) {
      res.status(422).json({ errors: ["Senha incorreta."] });
      return;
    }

    await createUserToken(employee, req, res);
  }

  static async currentUser(req, res) {
    const employee = req.user;
    res.status(200).json(employee);
  }

  static async createEmployee(req, res) {
    const { name, email, cpf, role } = req.body;
    const permission = false;
    // const employee = new Employee({ name, email, cpf, role, permission });

    try {
      const checkEmail = await Employee.findOne({ email: email });
      const checkCPF = await Employee.findOne({ cpf: cpf });

      if (checkEmail) {
        return res.status(409).json({ errors: ["Email já utilizado"] });
      }
      if (checkCPF) {
        return res.status(409).json({ errors: ["CPF já utilizado"] });
      }
      const employee = new Employee({
        name,
        email,
        cpf,
        role,
        permission,
      });

      const newEmployee = await employee.save();
      console.log("oi");
      // const newEmployee = await employee.save();
      console.log("newEmployee", newEmployee);
      res
        .status(201)
        .json({ message: "Funcionário criado com sucesso!", newEmployee });
    } catch (error) {
      res.status(500).json({ errors: ["Houve um erro, tente novamente"] });
    }
  }

  static async getEmployees(req, res) {
    const employees = await Employee.find();

    res.status(200).json(employees);
  }

  static async getEmployeeById(req, res) {
    const { id } = req.params;
    try {
      const employee = await Employee.findById(id);

      if (!employee) {
        res.status(404).json({ errors: ["Funcionário não encontrado"] });
        return;
      }

      res.status(200).json(employee);
    } catch (error) {
      res.status(422).json({ errors: ["Houve um erro, tente novamente"] });
    }
  }

  static async deleteEmployee(req, res) {
    const { id } = req.params;

    try {
      const employee = await Employee.findById(id);
      console.log("GET", employee._id);
      if (!employee) {
        res.status(404).json({ errors: ["Funcionário não encontrado"] });
        return;
      }
      const token = getToken(req);
      const user = await getUserByToken(token);
      console.log("REWQ", user._id);

      if (employee._id.toString() === user._id.toString()) {
        res
          .status(422)
          .json({ errors: ["Você não pode excluir seu registro"] });
        return;
      }
      // await employee.deleteOne({ _id: id });

      res.status(200).json({ message: "Funcionário deletado com sucesso." });
    } catch (error) {
      return res
        .status(422)
        .json({ errors: ["Houve um erro, tente novamente"] });
    }
  }

  static async editEmployee(req, res) {
    const { id } = req.params;
    const { name, role, email, password, confirmPassword } = req.body;

    const employee = await Employee.findById({ _id: id });

    if (!employee) {
      return res.status(404).json({ errors: ["Funcionário não encontrado."] });
    }

    if (name) {
      employee.name = name;
    }
    if (role) {
      employee.role = role;
    }
    if (email) {
      employee.email = email;
    }

    try {
      await Employee.findOneAndUpdate(
        { _id: employee._id },
        { $set: employee },
        { new: true }
      );

      res.status(200).json({ message: "Usuário atualizado com sucesso!" });
    } catch (error) {
      res.status(500).json({ errors: ["Houve um erro, tente novamente"] });
    }
  }

  static async givePermission(req, res) {
    const { id } = req.params;

    try {
      const employee = await Employee.findById(id);

      if (employee.permission) {
        return res
          .status(422)
          .json({ errors: ["Usuário já tem permissões concedidas"] });
      } else {
        employee.permission = true;
      }

      await Employee.findOneAndUpdate({ _id: employee._id }, employee);

      res.status(200).json({
        message: `Permissão concedida ao funcionário ${employee.name}`,
      });
    } catch (error) {
      res.status(500).json({ errors: ["Houve um erro, tente novamente."] });
    }
  }

  static async changePassword(req, res) {
    const { password, confirmPassword } = req.body;
    const { id } = req.params;
    const employee = await Employee.findById({ _id: id });

    if (!employee) {
      return res.status(404).json({ errors: ["Funcionário não encontrado."] });
    }

    if (password !== confirmPassword) {
      res.status(422).json({ errors: ["Senhas não coincidentes!"] });
      return;
    } else if (password === confirmPassword && password != null) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      employee.password = passwordHash;
      res.status(200).json({ message: "Senha alterada com sucesso" });
    }
  }
};
