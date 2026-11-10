
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Badge, Spinner } from "react-bootstrap";



export interface VerificationResult {
    verified: boolean;

    merchantName?: string;

    bankName?: string;

    accountName?: string;

    accountNumberMasked?: string;

    trustScore?: number | null;

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
        if (!verification.verified || !acknowledged || loading) return;

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
                        ? "✅ Merchant Registered with PayVerify"
                        : "⚠ Merchant Not Registered"}

                </Modal.Title>

            </Modal.Header>

            <Modal.Body>
                {verification.verified && (
                    <div className="alert alert-info">
                        PayVerify confirms merchant registration only. This check does not establish bank ownership or financial trustworthiness.
                    </div>
                )}

                {verification.verified ? (

                    <table className="table">

                        <tbody>

                            <tr>
                                <th>Merchant</th>
                                <td>{verification.merchantName}</td>
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

                            Payment cannot continue because this merchant is not registered.

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
                            : "This merchant is not registered with PayVerify."
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
                        loading || !verification.verified
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