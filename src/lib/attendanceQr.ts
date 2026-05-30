type AttendanceQrPayload = Record<string, unknown>;

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
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Format de QR code non reconnu.");
    }

    return parsed as AttendanceQrPayload;
  } catch {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawValue)) {
      return { type: "employee-attendance", id: rawValue };
    }

    throw new Error("QR code invalide ou illisible.");
  }
};

export const getQrEmployeeId = (payload: AttendanceQrPayload): string | null => {
  return getFirstStringValue(payload, [
    "employeeId",
    "employee_id",
    "profileId",
    "profile_id",
    "id",
    "uid",
  ]);
};

export const getQrOrganizationId = (payload: AttendanceQrPayload): string | null => {
  return getFirstStringValue(payload, ["organizationId", "organization_id", "org"]);
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