import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import { ButtonLink } from "../components/ui/Button";

// The `errorElement` for both the public pages and the admin pages (see
// router.tsx). Without one, any render-time throw left a blank page -- this
// keeps people inside the site with a way back.
function ErrorPage() {
  const error = useRouteError();

  const heading = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something Went Wrong";

  return (
    <Section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Container className="flex flex-col items-center gap-4">
        <Eyebrow>Sorry</Eyebrow>
        <PageHeading>{heading}</PageHeading>
        <p className="max-w-md font-body text-ink/75">
          This page ran into a problem on our end. Everything else on the site
          should still work. Try refreshing, or head back home.
        </p>
        <ButtonLink to="/" variant="secondary">
          Back Home
        </ButtonLink>
      </Container>
    </Section>
  );
}

export default ErrorPage;
