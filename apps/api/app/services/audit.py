from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def write_audit_log(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    metadata: dict,
    user_id: int | None = None,
    merchant_id: int | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            merchant_id=merchant_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=metadata,
        )
    )

