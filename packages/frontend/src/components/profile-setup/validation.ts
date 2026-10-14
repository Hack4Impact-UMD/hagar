import type { UserRegion } from "@repo/common";
import { profilePhotoProblem } from "@frontend/lib/profilePhotos.ts";

export interface ProfileFormErrors {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
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

  const phone = values.phoneNumber.trim();
  if (!phone) {
    errors.phoneNumber = "Phone number is required.";
  } else if (phone.length > 100) {
    errors.phoneNumber = "Phone number must be 100 characters or fewer.";
  }

  if (!values.region) {
    errors.region = "Please select a region.";
  }

  if (!values.photo) {
    errors.photo = "Profile photo is required.";
  } else {
    const photoIssue = profilePhotoProblem(values.photo);
    if (photoIssue) {
      errors.photo = photoIssue;
    }
  }

  return errors;
}