
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Badge, Spinner } from "react-bootstrap";



export interface VerificationResult {
    verified: boolean;

    merchantName?: string;

    bankName?: string;

    accountName?: string;

    accountNumberMasked?: string;

    trustScore?: number;

    verificationStatus?: string | null;

    verificationCount?: number | string;

    verificationBadge?: string;

    reasonCode?: string;

    message: string;
}

interface Props {

    show: boolean;

    verification: VerificationResult | null;

    loading: boolean;

    onContinue: (acknowledgedUnverified: boolean) => Promise<void>;

    onCancel: () => void;
}

const VerificationModal: React.FC<Props> = ({
    show,
    verification,
    loading,
    onContinue,
    onCancel
}) => {

    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {

        setAcknowledged(false);

    }, [show]);

    if (!verification) return null;

    const continueClicked = async () => {

        await onContinue(
            !verification.verified
        );

    };

    return (

        <Modal
            show={show}
            backdrop="static"
            keyboard={false}
            centered
            size="lg"
        >

            <Modal.Header>

                <Modal.Title>

                    {verification.verified
                        ? "✅ Verified by PayVerify"
                        : "⚠ Merchant Not Verified"}

                </Modal.Title>

            </Modal.Header>

            <Modal.Body>

                {verification.verified ? (

                    <table className="table">

                        <tbody>

                            <tr>
                                <th>Merchant</th>
                                <td>{verification.merchantName}</td>
                            </tr>

                            <tr>
                                <th>Bank</th>
                                <td>{verification.bankName}</td>
                            </tr>

                            <tr>
                                <th>Account</th>
                                <td>{verification.accountNumberMasked}</td>
                            </tr>

                            <tr>
                                <th>Trust Score</th>
                                <td>

                                    <Badge bg="success">

                                        {verification.trustScore}

                                    </Badge>

                                </td>

                            </tr>

                            <tr>
                                <th>Verification Count</th>
                                <td>{verification.verificationCount}</td>
                            </tr>

                            <tr>
                                <th>Status</th>

                                <td>

                                    <Badge bg="primary">

                                        {verification.verificationBadge}

                                    </Badge>

                                </td>

                            </tr>

                        </tbody>

                    </table>

                ) : (

                    <div className="alert alert-danger">

                        <h5>

                            Merchant Not Registered

                        </h5>

                        <p className="mb-2">

                            {verification.message}

                        </p>

                        <strong>

                            Proceed with caution.

                        </strong>

                    </div>

                )}

                <Form.Check

                    className="mt-3"

                    checked={acknowledged}

                    onChange={(e) =>
                        setAcknowledged(
                            e.target.checked
                        )
                    }

                    label={
                        verification.verified
                            ? "I have reviewed the merchant verification information."
                            : "I understand this merchant is NOT registered with PayVerify and wish to continue."
                    }

                />

            </Modal.Body>

            <Modal.Footer>

                <Button

                    variant="secondary"

                    disabled={loading}

                    onClick={onCancel}

                >

                    Cancel

                </Button>

                <Button

                    variant={
                        verification.verified
                            ? "success"
                            : "warning"
                    }

                    disabled={
                        !acknowledged ||
                        loading
                    }

                    onClick={continueClicked}

                >

                    {loading ? (

                        <>

                            <Spinner
                                animation="border"
                                size="sm"
                                className="me-2"
                            />

                            Redirecting...

                        </>

                    ) : (

                        "Continue Payment"

                    )}

                </Button>

            </Modal.Footer>

        </Modal>

    );

};

export default VerificationModal;