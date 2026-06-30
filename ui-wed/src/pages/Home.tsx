import Countdown from "../components/Countdown";
import heroImg from "../assets/hero.png";
import { wedding } from "../config/wedding";

function Home() {
  const formattedDate = wedding.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main>
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center gap-8 overflow-hidden px-6 py-20 text-center">
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
        />

        <p className="font-body text-sm uppercase tracking-[0.3em] text-olive">
          We're getting married
        </p>
        <h1 className="font-heading text-5xl text-walnut sm:text-6xl">
          {wedding.coupleNames}
        </h1>
        <p className="font-body text-base text-slate sm:text-lg">
          {formattedDate} &middot; {wedding.location.venue},{" "}
          {wedding.location.city}
        </p>

        <Countdown target={wedding.date} />
      </section>
    </main>
  );
}

export default Home;
