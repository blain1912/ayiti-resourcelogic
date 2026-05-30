type AttendanceQrPayload = Record<string, unknown>;

export const parseAttendanceQrPayload = (qrData: string): AttendanceQrPayload => {
  try {
    const parsed = JSON.parse(qrData);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Format de QR code non reconnu.");
    }

    return parsed as AttendanceQrPayload;
  } catch {
    throw new Error("QR code invalide ou illisible.");
  }
};

export const getQrEmployeeId = (payload: AttendanceQrPayload): string | null => {
  const value = payload.employeeId || payload.profileId || payload.id || payload.uid;
  return typeof value === "string" && value.trim() ? value : null;
};

export const getQrOrganizationId = (payload: AttendanceQrPayload): string | null => {
  const value = payload.organizationId || payload.organization_id || payload.org;
  return typeof value === "string" && value.trim() ? value : null;
};

export const isCentralAttendanceQr = (payload: AttendanceQrPayload) =>
  payload.type === "central-attendance";

export const isEmployeeAttendanceQr = (payload: AttendanceQrPayload) =>
  Boolean(getQrEmployeeId(payload));