import { validatePhoneNumber } from "@repo/common";
import type { PhoneErrors, UserRegion } from "@repo/common";
import { profilePhotoProblem } from "@frontend/lib/profilePhotos.ts";

export interface ProfileFormErrors extends PhoneErrors {
  firstName?: string;
  lastName?: string;
  region?: string;
  photo?: string;
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

  // Use the shared phone validation logic from common
  const phoneResult = validatePhoneNumber({ phoneNumber: values.phoneNumber });
  if (phoneResult.phoneNumber) {
    errors.phoneNumber = phoneResult.phoneNumber;
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
