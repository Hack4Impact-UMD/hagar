export interface PhoneErrors {
  phoneNumber?: string;
}

// Only allow digits, spaces, +, -, (, and )
const PHONE_CHARS_REGEX = /^[+\d\s()-]+$/;

/**
 * Auto-formats standard 10-digit numbers as XXX-XXX-XXXX as the user types,
 * while leaving international numbers (starting with + or >10 digits) flexible.
 */
export function formatPhoneNumber(input: string): string {
  const cleaned = input.replace(/[^\d+\s()-]/g, "");

  if (cleaned.startsWith("+") || cleaned.includes("(")) {
    return cleaned;
  }

  const digits = cleaned.replace(/\D/g, "");

  if (digits.length > 10) {
    return digits;
  }

  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function validatePhoneNumber(values: {
  phoneNumber: string;
}): PhoneErrors {
  const errors: PhoneErrors = {};
  const phone = values.phoneNumber.trim();
  const phoneDigits = phone.replace(/\D/g, "");

  if (!phone) {
    errors.phoneNumber = "Phone number is required.";
  } else if (phone.length > 100) {
    errors.phoneNumber = "Phone number must be 100 characters or fewer.";
  } else if (
    !PHONE_CHARS_REGEX.test(phone) ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15
  ) {
    errors.phoneNumber = "Enter a valid phone number.";
  }
  return errors;
}
