type AttendanceQrPayload = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getFirstStringValue = (
  payload: AttendanceQrPayload,
  keys: string[]
): string | null => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

export const parseAttendanceQrPayload = (qrData: string): AttendanceQrPayload => {
  const rawValue = qrData.trim();

  try {
    const url = new URL(rawValue);
    const params = url.searchParams;
    const organizationId = params.get("organizationId") || params.get("organization_id") || params.get("org") || params.get("o");
    const employeeId = params.get("employeeId") || params.get("employee_id") || params.get("profileId") || params.get("profile_id") || params.get("id");
    const date = params.get("date");

    if (organizationId) {
      return {
        type: "central-attendance",
        organizationId,
        organization_id: organizationId,
        org: organizationId,
        date,
        dailyCode: params.get("dailyCode") || params.get("code"),
      };
    }

    if (employeeId) {
      return { type: "employee-attendance", id: employeeId };
    }

    const pathUuid = url.pathname.split("/").find((segment) => UUID_PATTERN.test(segment));
    if (pathUuid) {
      return { type: "employee-attendance", id: pathUuid };
    }
  } catch {
    // Not a URL, continue with compact and JSON formats.
  }

  const centralMatch = rawValue.match(/^ATT-CENTRAL:([^:]+):(\d{4}-\d{2}-\d{2})(?::(.+))?$/i);
  if (centralMatch) {
    return {
      type: "central-attendance",
      organizationId: centralMatch[1],
      organization_id: centralMatch[1],
      org: centralMatch[1],
      date: centralMatch[2],
      dailyCode: centralMatch[3] || null,
    };
  }

  const employeeMatch = rawValue.match(/^ATT-EMP:([^:]+)$/i);
  if (employeeMatch) {
    return { type: "employee-attendance", id: employeeMatch[1] };
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Format de QR code non reconnu.");
    }

    const nestedValue = (parsed as AttendanceQrPayload).data || (parsed as AttendanceQrPayload).payload || (parsed as AttendanceQrPayload).qr;
    if (typeof nestedValue === "string" && nestedValue.trim() !== rawValue) {
      return parseAttendanceQrPayload(nestedValue);
    }

    return parsed as AttendanceQrPayload;
  } catch {
    if (UUID_PATTERN.test(rawValue)) {
      return { type: "employee-attendance", id: rawValue };
    }

    throw new Error("QR code invalide ou illisible.");
  }
};

export const getQrEmployeeId = (payload: AttendanceQrPayload): string | null => {
  return getFirstStringValue(payload, [
    "employeeId",
    "employee_id",
    "employee",
    "profileId",
    "profile_id",
    "profile",
    "id",
    "uid",
  ]);
};

export const getQrOrganizationId = (payload: AttendanceQrPayload): string | null => {
  return getFirstStringValue(payload, ["organizationId", "organization_id", "org", "o"]);
};

export const getQrMatricule = (payload: AttendanceQrPayload): string | null => {
  return getFirstStringValue(payload, [
    "matricule",
    "code_budgetaire",
    "employeeCode",
    "employee_code",
  ]);
};

export const getQrEmail = (payload: AttendanceQrPayload): string | null => {
  return getFirstStringValue(payload, ["email", "mail"]);
};

export const isCentralAttendanceQr = (payload: AttendanceQrPayload) =>
  payload.type === "central-attendance";

export const isEmployeeAttendanceQr = (payload: AttendanceQrPayload) =>
  Boolean(getQrEmployeeId(payload));

export const buildCentralAttendanceQrValue = (
  organizationId: string,
  date: string,
  dailyCode?: string | null
) => `ATT-CENTRAL:${organizationId}:${date}${dailyCode ? `:${dailyCode}` : ""}`;

export const buildEmployeeAttendanceQrValue = (employeeId: string) => `ATT-EMP:${employeeId}`;