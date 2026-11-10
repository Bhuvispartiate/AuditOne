import { NextRequest, NextResponse } from "next/server";
import { pmsStore } from "@/lib/data/store";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const employees = pmsStore.getEmployees();
    const employee = employees.find(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );

    if (!employee) {
      return NextResponse.json(
        {
          allowed: false,
          error: "Unauthorized Account: This Google account is not registered in the active Employee Directory.",
        },
        { status: 403 }
      );
    }

    if (!employee.is_active || employee.employment_status !== "Active") {
      return NextResponse.json(
        {
          allowed: false,
          error: "Access Suspended: Your employee account has been deactivated.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
      employee: {
        id: employee.id,
        code: employee.employee_code,
        fullName: employee.full_name,
        role: employee.role_code || "EMPLOYEE",
        department: employee.department_name,
        designation: employee.designation_name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

