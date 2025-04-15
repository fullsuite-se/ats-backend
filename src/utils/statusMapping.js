const mapStatusToStage = (status) => {
    let pre_screening = ["UNPROCESSED", "PRE_SCREENING", "TEST_SENT"];
    let interview_schedule = ["INTERVIEW_SCHEDULE_SENT", "PHONE_INTERVIEW", "FIRST_INTERVIEW", "SECOND_INTERVIEW", "THIRD_INTERVIEW", "FOURTH_INTERVIEW", "FOLLOW_UP_INTERVIEW", "FINAL_INTERVIEW"];
    let job_offer = ["FOR_DECISION_MAKING", "FOR_JOB_OFFER", "JOB_OFFER_REJECTED", "JOB_OFFER_ACCEPTED", "FOR_FUTURE_POOLING"];
    let unsuccessful =["WITHDREW_APPLICATION","GHOSTED", "BLACKLISTED", "NOT_FIT"];

    if (status == pre_screening.includes(status)) {
        return "PRE_SCREENING";
    }
    else if (interview_schedule.includes(status)) {
        return "INTERVIEW_SCHEDULE";
    }
    else if (job_offer.includes(status)) {
        return "JOB_OFFER";
    }
    else if (unsuccessful.includes(status)) {
        return "UNSUCCESSFUL";
    }
    else {
        return "PRE_SCREENING";
    }
};

module.exports = {mapStatusToStage}