import type { Column } from './api';

export const SCHEMA_COLUMNS: Record<string, Column[]> = {
  "users": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "phone",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "email",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "password_hash",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "full_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "avatar_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "gender",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "date_of_birth",
      "type": "date",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "address",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "emergency_contact_name",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "emergency_contact_phone",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "purpose",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "BEAUTY_SPA",
        "ACADEMY",
        "BOTH"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "role",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "CUSTOMER",
        "STUDENT",
        "TECHNICIAN",
        "INSTRUCTOR",
        "CASHIER",
        "RECEPTIONIST",
        "BRANCH_MANAGER",
        "ADMIN",
        "SUPER_ADMIN"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "membership_tier",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "STANDARD",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "DIAMOND"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "reward_points",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "total_spent",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "referral_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "referred_by_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "locked_reason",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "locked_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "fcm_device_token",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "user_settings": [
    {
      "name": "user_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "biometric_enabled",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "appointment_reminder",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "promotion_notify",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "system_notify",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "language",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "roles": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_system",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "permissions": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "module",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "role_permissions": [
    {
      "name": "role_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "roles",
        "column": "id"
      }
    },
    {
      "name": "permission_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "permissions",
        "column": "id"
      }
    }
  ],
  "user_roles": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "role_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "roles",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "granted_by",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "branches": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "phone",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "address",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "district",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "city",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "latitude",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "longitude",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "opening_time",
      "type": "time",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "closing_time",
      "type": "time",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "image_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "gallery_urls",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "amenities",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "branch_rooms": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "room_type",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "VIP_ROOM",
        "MASSAGE_ROOM",
        "HEAD_SPA_ROOM",
        "SKINCARE_ROOM",
        "ACADEMY_CLASSROOM",
        "PRACTICE_LAB"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "bed_capacity",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_available",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "staff_profiles": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "employee_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "department",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "RECEPTION",
        "CASHIER",
        "THERAPY_MASSAGE",
        "SKINCARE",
        "ACADEMY_TRAINING",
        "CUSTOMER_SERVICE",
        "ADMINISTRATION"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "position",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "employment_type",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "FULL_TIME",
        "PART_TIME",
        "PROBATION",
        "INTERN"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "base_salary",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "commission_rate",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "hire_date",
      "type": "date",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "resignation_date",
      "type": "date",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "id_card_number",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "bank_account_number",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "bank_name",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "technicians": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "staff_profile_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "staff_profiles",
        "column": "id"
      }
    },
    {
      "name": "full_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "title",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "avatar_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "experience_years",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "rating_avg",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "review_count",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "specialties",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "bio",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "technician_shifts": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "technician_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "technicians",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "assigned_room_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branch_rooms",
        "column": "id"
      }
    },
    {
      "name": "shift_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "start_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "end_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_cancelled",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "staff_leaves": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "staff_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "staff_profiles",
        "column": "id"
      }
    },
    {
      "name": "leave_type",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "start_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "end_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "reason",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "approved_by",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "approved_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "technician_slots": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "technician_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "technicians",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "slot_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "start_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "end_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "AVAILABLE",
        "HOLD",
        "BOOKED",
        "BLOCKED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "held_by_user_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "hold_expires_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "service_categories": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "icon_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "display_order",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "services": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "category_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "service_categories",
        "column": "id"
      }
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "slug",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "short_description",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "full_description",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "duration_minutes",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "price",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "discount_price",
      "type": "numeric",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "image_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "gallery_urls",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "steps",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "benefits",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "pricing_tiers",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "add_on_items",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_featured",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "coupons": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "discount_percent",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "discount_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "max_discount",
      "type": "numeric",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "min_order_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "valid_from",
      "type": "timestamptz",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "valid_to",
      "type": "timestamptz",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "usage_limit",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "used_count",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "bookings": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "booking_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "customer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "assigned_room_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branch_rooms",
        "column": "id"
      }
    },
    {
      "name": "assigned_bed_number",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "technician_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "technicians",
        "column": "id"
      }
    },
    {
      "name": "booking_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "start_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "end_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "PENDING",
        "CONFIRMED",
        "CHECKED_IN",
        "IN_SERVICE",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "payment_status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "UNPAID",
        "PENDING",
        "PARTIAL",
        "PAID",
        "REFUNDED",
        "FAILED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "payment_method",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "CASH_AT_SPA",
        "VNPAY",
        "MOMO",
        "BANK_TRANSFER",
        "MEMBERSHIP_WALLET",
        "SPLIT_PAYMENT"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "base_total",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "coupon_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "coupons",
        "column": "id"
      }
    },
    {
      "name": "discount_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "points_used",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "points_discount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "final_price",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "booked_for_name",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "booked_for_phone",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "special_notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "qr_code_hash",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "checked_in_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "checked_in_by_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "service_started_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "checked_out_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "checked_out_by_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "actual_duration_minutes",
      "type": "numeric",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "checkin_notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "has_medical_alert",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "cancellation_reason",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "cancelled_by_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "booking_items": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "booking_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "bookings",
        "column": "id"
      }
    },
    {
      "name": "service_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "services",
        "column": "id"
      }
    },
    {
      "name": "technician_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "technicians",
        "column": "id"
      }
    },
    {
      "name": "duration_minutes",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "price",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "treatment_packages": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "service_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "services",
        "column": "id"
      }
    },
    {
      "name": "total_sessions",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "price",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "discount_price",
      "type": "numeric",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "validity_months",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "image_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "user_packages": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "customer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "package_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "treatment_packages",
        "column": "id"
      }
    },
    {
      "name": "total_sessions",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "completed_sessions",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "ACTIVE",
        "COMPLETED",
        "EXPIRED",
        "CANCELLED",
        "PAUSED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "purchased_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "expires_at",
      "type": "timestamptz",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "treatment_journal": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_package_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "user_packages",
        "column": "id"
      }
    },
    {
      "name": "booking_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "bookings",
        "column": "id"
      }
    },
    {
      "name": "customer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "technician_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "technicians",
        "column": "id"
      }
    },
    {
      "name": "assigned_room_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branch_rooms",
        "column": "id"
      }
    },
    {
      "name": "session_number",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "session_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "condition_before",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "condition_after",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "treatment_notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "before_photos",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "after_photos",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "specialist_advice",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "customer_signature_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "consultation_surveys": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "customer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "booking_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "bookings",
        "column": "id"
      }
    },
    {
      "name": "focus_areas",
      "type": "text[]",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "pressure_pref",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": ["LIGHT", "MEDIUM", "STRONG"],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "has_sensitive_skin",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "has_oil_allergy",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "allergy_details",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "medical_conditions",
      "type": "text[]",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "special_requests",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "reviews": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "customer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "booking_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "bookings",
        "column": "id"
      }
    },
    {
      "name": "service_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "services",
        "column": "id"
      }
    },
    {
      "name": "technician_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "technicians",
        "column": "id"
      }
    },
    {
      "name": "rating",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "review_tags",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "comment",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "photos",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "branch_reply",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "home_care_guidelines": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "slug",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "category",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "read_time_minutes",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "summary",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "content",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "steps",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "image_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "author_name",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "view_count",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "is_featured",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_published",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "support_tickets": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "customer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "subject",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "message",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "PENDING",
        "PROCESSING",
        "RESOLVED",
        "CLOSED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "admin_reply",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "resolved_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "support_faqs": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "category",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "question",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "answer",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "display_order",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "membership_tier_rules": [
    {
      "name": "tier",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "STANDARD",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "DIAMOND"
      ],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "min_accumulated_spent",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "point_earning_rate",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "discount_service_percent",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "free_head_spa_sessions",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "birthday_voucher_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "coupons",
        "column": "id"
      }
    },
    {
      "name": "priority_booking",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "loyalty_point_settings": [
    {
      "name": "id",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "earn_amount_per_point",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "redeem_value_per_point",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "max_redeem_percent_per_order",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "point_expiry_months",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "voucher_distribution_rules": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "coupon_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "coupons",
        "column": "id"
      }
    },
    {
      "name": "trigger_event",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [
        "ON_SIGNUP",
        "ON_BIRTHDAY",
        "ON_TIER_UPGRADE",
        "ON_FIRST_BOOKING",
        "REFERRAL_INVITER",
        "REFERRAL_INVITEE",
        "MANUAL_BY_ADMIN",
        "PUBLIC_CLAIM"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "target_tier",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [
        "STANDARD",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "DIAMOND"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_auto_grant",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "notify_user",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "valid_days_after_claim",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "user_vouchers": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "coupon_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "coupons",
        "column": "id"
      }
    },
    {
      "name": "source_trigger",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "ON_SIGNUP",
        "ON_BIRTHDAY",
        "ON_TIER_UPGRADE",
        "ON_FIRST_BOOKING",
        "REFERRAL_INVITER",
        "REFERRAL_INVITEE",
        "MANUAL_BY_ADMIN",
        "PUBLIC_CLAIM"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "AVAILABLE",
        "USED",
        "EXPIRED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "claimed_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "expires_at",
      "type": "timestamptz",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "used_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "used_in_booking_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "bookings",
        "column": "id"
      }
    },
    {
      "name": "used_in_invoice_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "point_transactions": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "points_change",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "balance_after",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "action_type",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "reference_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "referrals": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "referrer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "referee_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "reward_points",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "reward_voucher_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "coupons",
        "column": "id"
      }
    },
    {
      "name": "is_rewarded",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "rewarded_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "course_categories": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "icon_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "display_order",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "instructors": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "full_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "title",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "avatar_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "experience_years",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "bio",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "achievements",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "courses": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "category_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_categories",
        "column": "id"
      }
    },
    {
      "name": "primary_instructor_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "instructors",
        "column": "id"
      }
    },
    {
      "name": "title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "short_description",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "full_description",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "level",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "BEGINNER",
        "INTERMEDIATE",
        "ADVANCED",
        "MASTER"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "total_hours",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "theory_hours",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "practice_hours",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "total_lessons",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "tuition_fee",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "deposit_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "learning_outcomes",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "certificate_title",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "image_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_featured",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "updated_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "course_chapters": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "course_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "courses",
        "column": "id"
      }
    },
    {
      "name": "chapter_order",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "description",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "course_lessons": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "chapter_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_chapters",
        "column": "id"
      }
    },
    {
      "name": "lesson_order",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "lesson_type",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "VIDEO",
        "READING_DOC",
        "PRACTICE_GUIDE",
        "QUIZ"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "duration_minutes",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "video_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "content_text",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "attachments",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "learning_goals",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_free_preview",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "course_batches": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "course_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "courses",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "batch_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "instructor_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "instructors",
        "column": "id"
      }
    },
    {
      "name": "start_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "end_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "schedule_text",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "max_students",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "enrolled_count",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "UPCOMING",
        "OPEN_FOR_ENROLLMENT",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "course_enrollments": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "student_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "course_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "courses",
        "column": "id"
      }
    },
    {
      "name": "batch_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_batches",
        "column": "id"
      }
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "CONSULTING",
        "DEPOSITED",
        "ENROLLED",
        "STUDYING",
        "GRADUATED",
        "DROPPED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "tuition_total",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "amount_paid",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "completed_lessons_count",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "progress_percent",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    },
    {
      "name": "enrolled_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "user_lesson_progress": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "enrollment_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_enrollments",
        "column": "id"
      }
    },
    {
      "name": "lesson_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_lessons",
        "column": "id"
      }
    },
    {
      "name": "watched_seconds",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_completed",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "student_notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "completed_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "course_quizzes": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "course_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "courses",
        "column": "id"
      }
    },
    {
      "name": "title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "total_questions",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "time_limit_minutes",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "passing_score",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "quiz_questions": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "quiz_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_quizzes",
        "column": "id"
      }
    },
    {
      "name": "question_number",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "question_text",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "options",
      "type": "jsonb",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "correct_option",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "explanation",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "quiz_submissions": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "enrollment_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_enrollments",
        "column": "id"
      }
    },
    {
      "name": "quiz_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_quizzes",
        "column": "id"
      }
    },
    {
      "name": "score",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "correct_count",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "submitted_answers",
      "type": "jsonb",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "instructor_feedback",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "passed",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "submitted_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "batch_schedules": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "batch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_batches",
        "column": "id"
      }
    },
    {
      "name": "assigned_room_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branch_rooms",
        "column": "id"
      }
    },
    {
      "name": "session_date",
      "type": "date",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "start_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "end_time",
      "type": "time",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "topic",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_practice_lab",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "student_attendance": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "schedule_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "batch_schedules",
        "column": "id"
      }
    },
    {
      "name": "enrollment_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_enrollments",
        "column": "id"
      }
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "PRESENT",
        "ABSENT",
        "LATE",
        "EXCUSED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "check_in_time",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "marked_by_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    }
  ],
  "certificate_templates": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "background_image_url",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "title_text",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "signer_name",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "signer_title",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "signature_image_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "seal_image_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_active",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "student_certificates": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "enrollment_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_enrollments",
        "column": "id"
      }
    },
    {
      "name": "student_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "course_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "courses",
        "column": "id"
      }
    },
    {
      "name": "template_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "certificate_templates",
        "column": "id"
      }
    },
    {
      "name": "certificate_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "qr_verification_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "student_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "course_title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "issue_date",
      "type": "date",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "theory_score",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "practical_score",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "final_grade",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "certificate_pdf_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "DRAFT",
        "ISSUED",
        "REVOKED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "revoked_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "revocation_reason",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "student_academic_records": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "enrollment_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_enrollments",
        "column": "id"
      }
    },
    {
      "name": "theory_score",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "practical_score",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "attended_sessions",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "total_batch_sessions",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "attendance_rate",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "feedback_theory",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "feedback_practical",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "feedback_attendance",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "feedback_attitude",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_graduated",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "graduation_date",
      "type": "date",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "certificate_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "student_certificates",
        "column": "id"
      }
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "tuition_transactions": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "transaction_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "enrollment_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_enrollments",
        "column": "id"
      }
    },
    {
      "name": "student_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "course_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "courses",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "cashier_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "transaction_type",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "DEPOSIT",
        "FULL_PAYMENT",
        "INSTALLMENT_1",
        "INSTALLMENT_2",
        "REMAINING_BALANCE",
        "REFUND"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "amount",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "payment_method",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "CASH_AT_SPA",
        "VNPAY",
        "MOMO",
        "BANK_TRANSFER",
        "MEMBERSHIP_WALLET",
        "SPLIT_PAYMENT"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "payment_status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "UNPAID",
        "PENDING",
        "PARTIAL",
        "PAID",
        "REFUNDED",
        "FAILED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "receipt_number",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "receipt_pdf_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "due_date",
      "type": "date",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "paid_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "invoices": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "invoice_code",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "branches",
        "column": "id"
      }
    },
    {
      "name": "customer_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "cashier_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "booking_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "bookings",
        "column": "id"
      }
    },
    {
      "name": "user_package_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "user_packages",
        "column": "id"
      }
    },
    {
      "name": "enrollment_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "course_enrollments",
        "column": "id"
      }
    },
    {
      "name": "subtotal",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "discount_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "points_redeemed_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "vat_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "total_amount",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "payment_method",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "CASH_AT_SPA",
        "VNPAY",
        "MOMO",
        "BANK_TRANSFER",
        "MEMBERSHIP_WALLET",
        "SPLIT_PAYMENT"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "payment_status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "UNPAID",
        "PENDING",
        "PARTIAL",
        "PAID",
        "REFUNDED",
        "FAILED"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "gateway_transaction_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "receipt_pdf_url",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "refund_amount",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "refunded_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "refund_reason",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "refunded_by_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "paid_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "invoice_items": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "invoice_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "invoices",
        "column": "id"
      }
    },
    {
      "name": "item_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "item_type",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "quantity",
      "type": "numeric",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "unit_price",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "amount",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "notifications": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "user_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "title",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "message",
      "type": "text",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "type",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "data",
      "type": "jsonb",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "is_read",
      "type": "bool",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "audit_logs": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "actor_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "action",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "table_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "record_id",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "old_data",
      "type": "jsonb",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "new_data",
      "type": "jsonb",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "ip_address",
      "type": "varchar",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "user_agent",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "staff_commissions": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "staff_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "users",
        "column": "id"
      }
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "commission_type",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [
        "SERVICE_DIRECT",
        "PACKAGE_UPSELL",
        "CSAT_BONUS"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "base_amount",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "percentage",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "commission_amount",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "status",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [
        "PENDING",
        "APPROVED",
        "PAID"
      ],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "cycle_month",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ],
  "service_materials": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "service_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": {
        "table": "services",
        "column": "id"
      }
    },
    {
      "name": "material_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "dosage_per_session",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "unit",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "notes",
      "type": "text",
      "required": false,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    }
  ],
  "inventory_consumption_logs": [
    {
      "name": "id",
      "type": "varchar",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": true,
      "writable": false,
      "reference": null
    },
    {
      "name": "branch_id",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "material_name",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "quantity_deducted",
      "type": "numeric",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "unit",
      "type": "varchar",
      "required": true,
      "hasDefault": false,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": true,
      "reference": null
    },
    {
      "name": "logged_at",
      "type": "timestamptz",
      "required": false,
      "hasDefault": true,
      "maxLength": null,
      "options": [],
      "primary": false,
      "writable": false,
      "reference": null
    }
  ]
};
