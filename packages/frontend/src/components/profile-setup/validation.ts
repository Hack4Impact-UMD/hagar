import type { UserRegion } from "@repo/common";
import { profilePhotoProblem } from "@frontend/lib/profilePhotos.ts";

export interface ProfileFormErrors {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  region?: string;
  photo?: string;
}

// Only allow digits, spaces, +, -, (, and )
const PHONE_CHARS_REGEX = /^[+\d\s()-]+$/;

/**
 * Auto-formats standard 10-digit numbers as XXX-XXX-XXXX as the user types,
 * while leaving international numbers (starting with + or >10 digits) flexible.
 */
export function formatPhoneNumber(input: string): string {
  // Strip any invalid characters immediately (letters, symbols other than + - ( ) space)
  const cleaned = input.replace(/[^\d+\s()-]/g, "");

  // If the user is typing an international number with '+' or parentheses,
  // don't force US/Canada XXX-XXX-XXXX dash positions.
  if (cleaned.startsWith("+") || cleaned.includes("(")) {
    return cleaned;
  }

  const digits = cleaned.replace(/\D/g, "");

  // If more than 10 digits, return raw digits/spaces so international numbers aren't mangled
  if (digits.length > 10) {
    return digits;
  }

  // Auto-insert dashes for 1–10 digit numbers: XXX-XXX-XXXX
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function validateProfileForm(values: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  region: UserRegion | "";
  photo: File | null;
}): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  const fn = values.firstName.trim();
  if (!fn) {
    errors.firstName = "First name is required.";
  } else if (fn.length > 500) {
    errors.firstName = "First name must be 500 characters or fewer.";
  }

  const ln = values.lastName.trim();
  if (!ln) {
    errors.lastName = "Last name is required.";
  } else if (ln.length > 500) {
    errors.lastName = "Last name must be 500 characters or fewer.";
  }

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
    // ITU-T E.164 international phone numbers have between 7 and 15 digits
    errors.phoneNumber = "Enter a valid phone number.";
  }

  if (!values.region) {
    errors.region = "Please select a region.";
  }

  if (values.photo) {
    const photoIssue = profilePhotoProblem(values.photo);
    if (photoIssue) {
      errors.photo = photoIssue;
    }
  } else {
    errors.photo = "Profile photo is required.";
  }

  return errors;
}
