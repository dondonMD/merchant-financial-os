from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class MerchantCreate(BaseModel):
    full_name: str = Field(min_length=3, max_length=120)
    phone: str = Field(min_length=9, max_length=32)
    business_name: str = Field(min_length=2, max_length=160)
    business_type: str = Field(min_length=2, max_length=80)
    national_id: str = Field(min_length=5, max_length=32)
    location: str = Field(min_length=2, max_length=120)
    language_preference: str = Field(default="en", pattern="^(en|sn|nd)$")
    email: str = Field(min_length=6, max_length=180)
    password: str = Field(min_length=8, max_length=120)
    device_id: str | None = None


class AllocationRuleUpdate(BaseModel):
    save_percent: Decimal = Field(ge=0, le=100)
    growth_percent: Decimal = Field(ge=0, le=100)
    round_up_enabled: bool

    @field_validator("growth_percent")
    @classmethod
    def validate_sum(cls, growth_percent: Decimal, info):
        save_percent = info.data.get("save_percent", Decimal("0"))
        if save_percent + growth_percent > Decimal("100"):
            raise ValueError("Savings and growth percentages cannot exceed 100")
        return growth_percent

