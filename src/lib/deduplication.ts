/**
 * Standard deduplication logic for form submissions
 * This ensures consistent deduplication across all parts of the application
 */

export const DEDUPLICATION_LOGIC = `
  CASE 
    WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
    WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
    ELSE CONCAT('unique_', fs.id)
  END
`;

export const DEDUPLICATION_PARTITION = `
  PARTITION BY 
    CASE 
      WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
      WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
      ELSE CONCAT('unique_', fs.id)
    END
  ORDER BY fs.timestamp DESC
`;

/**
 * Standard deduplication CTE (Common Table Expression)
 * Use this for consistent deduplication across all queries
 */
export const DEDUPLICATION_CTE = `
  WITH RankedSubmissions AS (
    SELECT 
      fs.*,
      ROW_NUMBER() OVER (
        PARTITION BY 
          CASE 
            WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
            WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
            ELSE CONCAT('unique_', fs.id)
          END
        ORDER BY fs.timestamp DESC
      ) as rn
    FROM form_submissions fs
    LEFT JOIN form_responses phone ON fs.id = phone.submission_id 
      AND phone.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'phone')
    LEFT JOIN form_responses email ON fs.id = email.submission_id 
      AND email.field_id IN (SELECT id FROM form_fields WHERE form_id = ? AND field_name = 'email')
    WHERE fs.form_id = ?
  )
  SELECT * FROM RankedSubmissions WHERE rn = 1
`;

/**
 * Get deduplication logic with custom table alias
 */
export function getDeduplicationLogic(tableAlias: string = 'fs'): string {
  return `
    CASE 
      WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
      WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
      ELSE CONCAT('unique_', ${tableAlias}.id)
    END
  `;
}

/**
 * Get deduplication partition with custom table alias
 */
export function getDeduplicationPartition(tableAlias: string = 'fs'): string {
  return `
    PARTITION BY 
      CASE 
        WHEN COALESCE(email.value, '') != '' AND TRIM(COALESCE(email.value, '')) != '' THEN TRIM(COALESCE(email.value, ''))
        WHEN COALESCE(phone.value, '') != '' AND TRIM(COALESCE(phone.value, '')) != '' THEN TRIM(COALESCE(phone.value, ''))
        ELSE CONCAT('unique_', ${tableAlias}.id)
      END
    ORDER BY ${tableAlias}.timestamp DESC
  `;
}
